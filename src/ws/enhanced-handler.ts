import { FastifyRequest } from 'fastify';
import { WebSocket, type RawData } from 'ws';
import { logger } from '../infrastructure/logger';
import { openaiService } from '../integrations/openai';
import { businessEngine } from '../modules/voice/engine';
import { sttService } from '../integrations/stt';
import { ttsService } from '../integrations/tts';
import { voiceSessionService } from '../modules/voice/session.service';
import { conversationMemory } from '../modules/voice/conversation';
import { WSMessage, WSMessageType, IntentExtraction, IntentType } from '../types';
import { websocketConnections, voiceCommandsProcessed } from '../infrastructure/metrics';
import { responseTemplateService } from '../modules/voice/response-template';

interface VoiceSession {
  ws: WebSocket;
  sessionId: string;
  conversationSessionId?: string;
  transcript: string;
  isActive: boolean;
  isRecording: boolean;
  audioChunks: Buffer[];
  audioFormat?: 'webm' | 'pcm';
  sttConnection: any; // Deepgram connection
  ttsProvider?: string; // TTS provider selected by client ('browser' | 'openai' | 'elevenlabs')
  pendingIntent?: IntentExtraction; // Set when awaiting user confirmation before execution
  ttsLanguage: string; // Active response language (BCP-47 code, default 'hi')
}

// Confidence thresholds for automatic execution vs confirmation
const CONFIDENCE_THRESHOLD_EXECUTE = 0.85; // ≥ this → auto-execute immediately
const CONFIDENCE_THRESHOLD_CONFIRM = 0.65;  // < this → ask to repeat; in-between → confirm first
const LARGE_AMOUNT_THRESHOLD = 5000;        // amounts above this always need confirmation

// System messages per language (repeat-command, yes/no prompt, cancelled, confirm suffix)
const SYSTEM_MSGS: Record<string, { repeat: string; askYesNo: string; cancelled: string; confirmSuffix: string }> = {
  hi: { repeat: 'Dobara boliye, samajh nahi aaya.', askYesNo: 'Haan ya nahi boliye.', cancelled: 'Theek hai, cancel kiya.', confirmSuffix: 'Haan ya nahi?' },
  en: { repeat: 'Please repeat, I did not understand.', askYesNo: 'Please say yes or no.', cancelled: 'Okay, cancelled.', confirmSuffix: 'Yes or no?' },
  bn: { repeat: 'আবার বলুন, বুঝতে পারিনি।', askYesNo: 'হ্যাঁ বা না বলুন।', cancelled: 'ঠিক আছে, বাতিল।', confirmSuffix: 'হ্যাঁ বা না?' },
  ta: { repeat: 'மீண்டும் சொல்லுங்கள், புரியவில்லை.', askYesNo: 'ஆம் அல்லது இல்லை சொல்லுங்கள்.', cancelled: 'சரி, ரத்து செய்யப்பட்டது.', confirmSuffix: 'ஆம் அல்லது இல்லை?' },
  te: { repeat: 'మళ్ళీ చెప్పండి, అర్థం కాలేదు.', askYesNo: 'అవును లేదా కాదు చెప్పండి.', cancelled: 'సరే, రద్దు చేయబడింది.', confirmSuffix: 'అవును లేదా కాదు?' },
  mr: { repeat: 'पुन्हा सांगा, समजले नाही.', askYesNo: 'हो किंवा नाही सांगा.', cancelled: 'ठीक आहे, रद्द केले.', confirmSuffix: 'हो किंवा नाही?' },
  gu: { repeat: 'ફરી કહો, સમજ ન આવ્યું.', askYesNo: 'હા અથવા ના કહો.', cancelled: 'ઠીક છે, રદ કર્યું.', confirmSuffix: 'હા અથવા ના?' },
  kn: { repeat: 'ಮತ್ತೆ ಹೇಳಿ, ಅರ್ಥವಾಗಲಿಲ್ಲ.', askYesNo: 'ಹೌದು ಅಥವಾ ಇಲ್ಲ ಹೇಳಿ.', cancelled: 'ಸರಿ, ರದ್ದು ಮಾಡಲಾಗಿದೆ.', confirmSuffix: 'ಹೌದು ಅಥವಾ ಇಲ್ಲ?' },
  pa: { repeat: 'ਦੁਬਾਰਾ ਕਹੋ, ਸਮਝ ਨਹੀਂ ਆਇਆ।', askYesNo: 'ਹਾਂ ਜਾਂ ਨਹੀਂ ਕਹੋ।', cancelled: 'ਠੀਕ ਹੈ, ਰੱਦ ਕੀਤਾ।', confirmSuffix: 'ਹਾਂ ਜਾਂ ਨਹੀਂ?' },
  ml: { repeat: 'വീണ്ടും പറയൂ, മനസ്സിലായില്ല.', askYesNo: 'അതെ അല്ലെങ്കിൽ അല്ല പറയൂ.', cancelled: 'ശരി, റദ്ദാക്കി.', confirmSuffix: 'അതെ അല്ലെങ്കിൽ അല്ല?' },
  ur: { repeat: 'دوبارہ بولیں، سمجھ نہیں آیا۔', askYesNo: 'ہاں یا نہیں کہیں۔', cancelled: 'ٹھیک ہے، منسوخ کیا۔', confirmSuffix: 'ہاں یا نہیں؟' },
  ar: { repeat: 'كرر من فضلك، لم أفهم.', askYesNo: 'قل نعم أو لا.', cancelled: 'حسناً، تم الإلغاء.', confirmSuffix: 'نعم أم لا؟' },
  es: { repeat: 'Repite por favor, no entendí.', askYesNo: 'Di sí o no.', cancelled: 'De acuerdo, cancelado.', confirmSuffix: '¿Sí o no?' },
  fr: { repeat: 'Répétez s\'il vous plaît, je n\'ai pas compris.', askYesNo: 'Dites oui ou non.', cancelled: 'D\'accord, annulé.', confirmSuffix: 'Oui ou non?' },
};

const getSysMsgs = (lang: string) => SYSTEM_MSGS[lang] ?? SYSTEM_MSGS['hi'];

// Confirmation message in each language after switching
const LANG_SWITCH_ACK: Record<string, string> = {
  hi: 'Hindi language set. Ab Hindi mein bolunga.',
  en: 'Language changed to English.',
  bn: 'বাংলা ভাষা সেট হয়েছে।',
  ta: 'தமிழ் மொழி அமைக்கப்பட்டது.',
  te: 'తెలుగు భాష సెట్ చేయబడింది.',
  mr: 'मराठी भाषा सेट केली.',
  gu: 'ગુજરાતી ભાષા સ્થાપિત.',
  kn: 'ಕನ್ನಡ ಭಾಷೆ ಹೊಂದಿಸಲಾಗಿದೆ.',
  pa: 'ਪੰਜਾਬੀ ਭਾਸ਼ਾ ਸੈੱਟ ਕੀਤੀ।',
  ml: 'മലയാളം ഭാഷ സജ്ജമാക്കി.',
  ur: 'اردو زبان سیٹ ہو گئی۔',
  ar: 'تم ضبط اللغة على العربية.',
  es: 'Idioma cambiado a español.',
  fr: 'Langue changée en français.',
};

class EnhancedWebSocketHandler {
  private sessions: Map<string, VoiceSession> = new Map();

  /**
   * Format milliseconds to readable format (e.g., "3.31s" or "250ms")
   */
  private formatTime(ms: number): string {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    return `${ms}ms`;
  }

  /**
   * Format milliseconds showing both seconds and milliseconds
   */
  private formatTimeDetailed(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;
    if (seconds > 0) {
      return `${seconds}s ${milliseconds}ms`;
    }
    return `${ms}ms`;
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(connection: WebSocket, request: FastifyRequest) {
    const sessionId = this.generateSessionId();

    const session: VoiceSession = {
      ws: connection,
      sessionId,
      transcript: '',
      isActive: false,
      isRecording: false,
      audioChunks: [],
      audioFormat: sttService.getProvider() === 'elevenlabs' ? 'pcm' : 'webm',
      sttConnection: null,
      ttsLanguage: 'hi', // Default to Hinglish; changed at runtime via voice command
    };

    this.sessions.set(sessionId, session);

    logger.info({ sessionId }, 'WebSocket connected');

    // Track active WebSocket connection
    websocketConnections.inc();

    // Send welcome message
    this.sendMessage(connection, {
      type: WSMessageType.VOICE_START,
      data: {
        sessionId,
        sttAvailable: sttService.isAvailable(),
        ttsAvailable: ttsService.isAvailable(),
        sttProvider: sttService.getProvider(),
        ttsProvider: ttsService.getProvider(),
      },
      timestamp: new Date().toISOString(),
    });

    // Handle messages (both text and binary)
    connection.on('message', async (data: RawData, isBinary: boolean) => {
      try {
        logger.debug(
          {
            sessionId,
            isBinary,
            dataLength: Buffer.isBuffer(data) ? data.length : (data as ArrayBuffer).byteLength,
            dataPreview: !isBinary ? data.toString().substring(0, 50) : '[binary]'
          },
          'Message received'
        );

        if (isBinary) {
          // Binary audio data
          const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
          await this.handleAudioData(sessionId, buffer);
          return;
        }

        const message = JSON.parse(data.toString());
        logger.info(
          { sessionId, messageType: message.type },
          'JSON message parsed'
        );
        await this.handleMessage(sessionId, message);
      } catch (error) {
        logger.error({ error, sessionId }, 'Message handling error');
        this.sendError(connection, 'Message processing failed');
      }
    });

    // Handle close
    connection.on('close', async () => {
      logger.info({ sessionId }, 'WebSocket disconnected');

      // Track disconnection
      websocketConnections.dec();

      await this.cleanupSession(sessionId);
    });

    // Handle errors
    connection.on('error', (error) => {
      logger.error({ error, sessionId }, 'WebSocket error');
    });
  }

  /**
   * Handle binary audio data
   */
  private async handleAudioData(sessionId: string, audioChunk: Buffer) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      logger.warn({ sessionId, sessionExists: !!session, isActive: session?.isActive }, 'Audio received but session not active');
      return;
    }

    logger.debug({ sessionId, audioSize: audioChunk.length }, 'Audio chunk received');

    // Add chunk to buffer
    session.audioChunks.push(audioChunk);

    // If we have an active STT connection, send data to it
    if (session.sttConnection) {
      try {
        logger.debug({ sessionId, audioSize: audioChunk.length }, 'Sending audio chunk to STT service');
        session.sttConnection.send(audioChunk);
      } catch (error) {
        logger.error({ error, sessionId }, 'Failed to send audio to STT');
      }
    } else {
      logger.warn({ sessionId }, 'Audio received but no STT connection available');
    }
  }

  /**
   * Handle incoming text messages
   */
  private async handleMessage(sessionId: string, message: any) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn({ sessionId, messageType: message.type }, 'Session not found for message');
      return;
    }

    logger.info(
      { sessionId, messageType: message.type, hasData: !!message.data },
      '📨 Message received - routing to handler'
    );

    switch (message.type) {
      case 'voice:start':
        logger.info({ sessionId }, 'voice:start message received - calling handleVoiceStart');
        await this.handleVoiceStart(session, message.data);
        break;

      case 'voice:stop':
        logger.info({ sessionId }, 'voice:stop message received - calling handleVoiceStop');
        await this.handleVoiceStop(session);
        break;

      case 'voice:transcript':
        logger.info({ sessionId }, 'voice:transcript message received');
        await this.handleTranscript(session, message.data);
        break;

      case 'voice:final':
        logger.info({ sessionId, textLength: message.data?.text?.length }, '✅ voice:final message received');
        await this.handleFinalTranscript(session, message.data);
        break;

      case 'recording:start':
        logger.info({ sessionId }, 'recording:start message received');
        await this.handleRecordingStart(session);
        break;

      case 'recording:stop':
        logger.info({ sessionId }, 'recording:stop message received');
        await this.handleRecordingStop(session);
        break;

      default:
        logger.warn({ sessionId, type: message.type, allKeys: Object.keys(message) }, '❌ Unknown message type');
    }
  }

  /**
   * Start voice capture with live STT
   */
  private async handleVoiceStart(session: VoiceSession, messageData?: any) {
    if (!sttService.isAvailable()) {
      this.sendError(session.ws, 'STT service not available');
      return;
    }

    try {
      // Extract TTS provider from client message
      if (messageData?.ttsProvider) {
        session.ttsProvider = messageData.ttsProvider;
      } else {
        session.ttsProvider = 'browser'; // Default fallback
      }

      logger.info(
        { sessionId: session.sessionId, provider: sttService.getProvider(), ttsProvider: session.ttsProvider },
        'Starting voice capture'
      );
      session.isActive = true;
      session.audioChunks = [];
      session.transcript = '';

      // Create conversation session
      const conversationSession = await voiceSessionService.createSession({
        sessionId: session.sessionId,
      });
      session.conversationSessionId = conversationSession.id;

      // Create live STT connection
      session.sttConnection = await sttService.createLiveTranscription(
        (text: string, isFinal: boolean) => {
          // Handle transcript
          logger.debug({ sessionId: session.sessionId, textLength: text.length, isFinal }, 'STT callback: received transcript');
          if (isFinal) {
            session.transcript = text;
            logger.info({ sessionId: session.sessionId, text, isFinal: true }, 'Final transcript received from STT');
            this.sendMessage(session.ws, {
              type: WSMessageType.VOICE_TRANSCRIPT,
              data: { text, isFinal: true },
              timestamp: new Date().toISOString(),
            });

            // Auto-process if transcript is complete - use session's ttsProvider
            if (text.trim().length > 0) {
              logger.info({ sessionId: session.sessionId }, 'Auto-processing final transcript');
              this.processFinalTranscript(session, text, session.ttsProvider || 'browser');
            }
          } else {
            // Interim results
            logger.debug({ sessionId: session.sessionId, text, isFinal: false }, 'Interim transcript from STT');
            this.sendMessage(session.ws, {
              type: WSMessageType.VOICE_TRANSCRIPT,
              data: { text, isFinal: false },
              timestamp: new Date().toISOString(),
            });
          }
        },
        (error: Error) => {
          logger.error({ error, sessionId: session.sessionId }, 'STT error callback triggered');
          this.sendError(session.ws, 'Speech recognition error');
        }
      );
      logger.info({ sessionId: session.sessionId }, 'STT connection created successfully');

      this.sendMessage(session.ws, {
        type: WSMessageType.VOICE_STARTED,
        data: { message: 'Voice capture started' },
        timestamp: new Date().toISOString(),
      });

      logger.info({ sessionId: session.sessionId }, 'Voice capture started');
    } catch (error) {
      logger.error({ error, sessionId: session.sessionId }, 'Failed to start voice capture');
      this.sendError(session.ws, 'Failed to start voice capture');
    }
  }

  /**
   * Stop voice capture
   */
  private async handleVoiceStop(session: VoiceSession) {
    session.isActive = false;

    // Close STT connection
    if (session.sttConnection) {
      try {
        session.sttConnection.finish();
      } catch (error) {
        logger.error({ error }, 'Error closing STT connection');
      }
      session.sttConnection = null;
    }

    // Save audio if recording was enabled
    if (session.isRecording && session.audioChunks.length > 0) {
      await this.saveRecording(session);
    }

    this.sendMessage(session.ws, {
      type: WSMessageType.VOICE_STOPPED,
      data: { message: 'Voice capture stopped' },
      timestamp: new Date().toISOString(),
    });

    logger.info({ sessionId: session.sessionId }, 'Voice capture stopped');
  }

  /**
   * Handle manual transcript (for testing without audio)
   */
  private async handleTranscript(session: VoiceSession, data: any) {
    session.transcript = data.text || '';

    this.sendMessage(session.ws, {
      type: WSMessageType.VOICE_TRANSCRIPT,
      data: { text: session.transcript },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle final transcript and process it
   */
  private async handleFinalTranscript(session: VoiceSession, data: any) {
    const finalText = data.text || session.transcript;
    const ttsProvider = data.ttsProvider || 'browser'; // Default to browser if not specified
    await this.processFinalTranscript(session, finalText, ttsProvider);
  }

  /**
   * Process final transcript through AI and business logic
   */
  private async processFinalTranscript(session: VoiceSession, text: string, ttsProvider: string = 'browser') {
    if (!text || text.trim().length === 0) {
      logger.warn({ sessionId: session.sessionId }, 'Empty text in processFinalTranscript - skipping');
      return;
    }

    // If awaiting confirmation for a pending intent, handle that first
    if (session.pendingIntent) {
      await this.handlePendingConfirmation(session, text, ttsProvider);
      return;
    }

    // **USER ACTIVITY FLOW TRACKING**
    const startTime = Date.now();
    const flowId = `${session.sessionId}-${Date.now()}`;

    // Log raw audio input from microphone before LLM processing
    const totalAudioSize = session.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    logger.info({
      flowId,
      sessionId: session.sessionId,
      rawAudioSource: 'microphone',
      rawAudioChunksCount: session.audioChunks.length,
      rawAudioTotalBytes: totalAudioSize,
      audioFormat: session.audioFormat,
      status: 'raw_audio_captured',
      timestamp: new Date().toISOString()
    }, '[RAW AUDIO] Audio captured from microphone');

    logger.info({
      flowId,
      sessionId: session.sessionId,
      userInput: text,
      status: 'user_input_received',
      timestamp: new Date().toISOString()
    }, 'User input received');

    // Acknowledge immediately so UI can show a spinner — zero latency
    this.sendMessage(session.ws, {
      type: 'voice:thinking',
      data: { transcript: text },
      timestamp: new Date().toISOString(),
    });

    try {
      // ✅ CHECK FOR ADMIN KEYWORDS IN ORIGINAL TEXT BEFORE NORMALIZATION
      const isAdminBefore = this.isAdminCommand(text);
      logger.debug(
        {
          sessionId: session.sessionId,
          originalText: text,
          isAdminDetectedOriginal: isAdminBefore
        },
        'Checking admin keywords in original text'
      );

      // 1. Extract intent + normalize in one LLM call (merged for speed)
      const intentStart = Date.now();
      const intent = await openaiService.extractIntent(text, text, session.conversationSessionId);
      const intentTime = Date.now() - intentStart;

      // Normalized text comes back inside the intent response (no extra round-trip)
      const normalizedText = intent.normalizedText || text;
      const normTime = 0; // merged into intent extraction above

      // Check if normalization removed admin keyword
      const isAdminAfter = this.isAdminCommand(normalizedText);
      logger.debug({
        sessionId: session.sessionId,
        originalText: text,
        normalizedText,
        isAdminBefore: isAdminBefore,
        isAdminAfter: isAdminAfter,
        normalizationTimeMs: normTime
      }, 'Transcript normalized (merged into intent extraction)');

      // ✅ AUTO-DETECT ADMIN from voice keywords (check ORIGINAL text, not normalized)
      if (isAdminBefore) {
        intent.entities = intent.entities || {};
        intent.entities.operatorRole = 'admin';
        intent.entities.adminEmail = process.env.ADMIN_EMAIL || 'bharatveeryadavg@gmail.com';
        logger.info(
          {
            sessionId: session.sessionId,
            adminEmail: intent.entities.adminEmail,
            originalText: text,
            normalizedText: normalizedText
          },
          '🔐 [ADMIN MODE DETECTED] Admin keyword found in original voice command'
        );
      }

      logger.info({
        flowId,
        sessionId: session.sessionId,
        userInput: text,
        intent: intent.intent,
        intentConfidence: intent.confidence,
        entities: intent.entities,
        responseTimeMs: intentTime,
        status: 'intent_detected',
        timestamp: new Date().toISOString()
      }, `[USER FLOW] Intent detected: ${intent.intent}`);

      // Log user message to conversation memory
      if (session.conversationSessionId) {
        conversationMemory.addUserMessage(
          session.conversationSessionId,
          normalizedText,
          intent.intent,
          intent.entities
        );
      }

      this.sendMessage(session.ws, {
        type: WSMessageType.VOICE_INTENT,
        data: intent,
        timestamp: new Date().toISOString(),
      });

      // --- LANGUAGE SWITCH ---
      if (intent.intent === IntentType.SWITCH_LANGUAGE) {
        const newLang = intent.entities?.language as string | undefined;
        if (newLang) {
          session.ttsLanguage = newLang;
          const ack = LANG_SWITCH_ACK[newLang] ?? `Language set to ${newLang}.`;
          logger.info({ sessionId: session.sessionId, ttsLanguage: newLang }, 'TTS language switched');
          this.sendMessage(session.ws, {
            type: 'voice:language_changed',
            data: { language: newLang, text: ack },
            timestamp: new Date().toISOString(),
          });
          this.sendMessage(session.ws, {
            type: WSMessageType.VOICE_RESPONSE,
            data: { text: ack },
            timestamp: new Date().toISOString(),
          });
          if (ttsProvider !== 'browser' && ttsService.isAvailable()) {
            await this.generateAndSendTTS(session, ack, ttsProvider);
          }
        }
        session.transcript = '';
        return;
      }

      // --- CONFIDENCE GATE ---
      if (intent.confidence < CONFIDENCE_THRESHOLD_CONFIRM) {
        // Too uncertain — ask to repeat without executing
        const repeatText = getSysMsgs(session.ttsLanguage).repeat;
        logger.info({ sessionId: session.sessionId, confidence: intent.confidence, intent: intent.intent }, 'Confidence too low — asking to repeat');
        this.sendMessage(session.ws, {
          type: WSMessageType.VOICE_RESPONSE,
          data: { text: repeatText },
          timestamp: new Date().toISOString(),
        });
        if (ttsProvider !== 'browser' && ttsService.isAvailable()) {
          await this.generateAndSendTTS(session, repeatText, ttsProvider);
        }
        session.transcript = '';
        return;
      }

      if (this.intentNeedsConfirmation(intent)) {
        // Store intent and ask for verbal confirmation before executing
        session.pendingIntent = intent;
        const confirmText = this.buildConfirmMessage(intent, session.ttsLanguage);
        logger.info({ sessionId: session.sessionId, confirmText, intent: intent.intent, confidence: intent.confidence }, 'Confirmation required before execution');
        this.sendMessage(session.ws, {
          type: 'voice:confirm_needed',
          data: { text: confirmText, intent: intent.intent, confidence: intent.confidence },
          timestamp: new Date().toISOString(),
        });
        this.sendMessage(session.ws, {
          type: WSMessageType.VOICE_RESPONSE,
          data: { text: confirmText },
          timestamp: new Date().toISOString(),
        });
        if (ttsProvider !== 'browser' && ttsService.isAvailable()) {
          await this.generateAndSendTTS(session, confirmText, ttsProvider);
        }
        session.transcript = '';
        return;
      }
      // --- END CONFIDENCE GATE ---

      // 2. Execute business logic
      const execStart = Date.now();
      const executionResult = await businessEngine.execute(intent, session.conversationSessionId);
      const execTime = Date.now() - execStart;

      logger.info({
        flowId,
        sessionId: session.sessionId,
        intent: intent.intent,
        executionSuccess: executionResult.success,
        executionMessage: executionResult.message,
        responseTimeMs: execTime,
        status: 'business_logic_executed',
        timestamp: new Date().toISOString()
      }, `[USER FLOW] Business execution: ${executionResult.success ? 'SUCCESS' : 'FAILED'}`);

      // Track voice command processing
      voiceCommandsProcessed.inc({
        status: executionResult.success ? 'success' : 'error',
        provider: sttService.getProvider(),
      });

      // 3. Generate response
      let response: string;
      if (intent.intent === 'LIST_CUSTOMER_BALANCES' && responseTemplateService.canUseTemplate(intent.intent)) {
        response = responseTemplateService.generateFastResponse(intent.intent, executionResult) || executionResult.message;
      } else {
        // Stream tokens to client as they arrive
        const responseStart = Date.now();
        response = await openaiService.generateResponse(
          executionResult,
          intent.intent,
          session.conversationSessionId,
          (chunk) => {
            this.sendMessage(session.ws, {
              type: 'voice:response:chunk',
              data: { text: chunk },
              timestamp: new Date().toISOString(),
            });
          },
          { userLanguage: session.ttsLanguage }
        );
        const responseTime = Date.now() - responseStart;
        logger.info({
          flowId,
          sessionId: session.sessionId,
          intent: intent.intent,
          response: response,
          responseTimeMs: responseTime,
          status: 'response_generated',
          timestamp: new Date().toISOString()
        }, `[USER FLOW] Response generated: ${response}`);
      }

      // Log assistant response to conversation memory
      if (session.conversationSessionId) {
        conversationMemory.addAssistantMessage(session.conversationSessionId, response);
      }

      // 4. Send text response
      const totalTime = Date.now() - startTime;
      const totalAudioSize = session.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const formattedTime = this.formatTimeDetailed(totalTime);
      logger.info({
        flowId,
        sessionId: session.sessionId,
        userInput: text,
        intent: intent.intent,
        response: response,
        ttsProvider: ttsProvider,
        totalResponseTimeMs: totalTime,
        totalResponseTimeFormatted: formattedTime,
        audioFormat: session.audioFormat,
        rawAudioChunksCount: session.audioChunks.length,
        rawAudioTotalBytes: totalAudioSize,
        breakdown: {
          normalizationMs: normTime,
          intentExtractionMs: intentTime,
          businessLogicMs: execTime,
        },
        status: 'complete_flow',
        timestamp: new Date().toISOString()
      }, `[USER FLOW COMPLETE] Input → Intent → Execution → Response (${totalTime}ms)`);

      this.sendMessage(session.ws, {
        type: WSMessageType.VOICE_RESPONSE,
        data: {
          text: response,
          executionResult,
        },
        timestamp: new Date().toISOString(),
      });
      logger.info({ sessionId: session.sessionId }, 'VOICE_RESPONSE message sent successfully');

      // 5. Generate and send TTS audio (only for paid providers, not for browser speech)
      if (ttsService.isAvailable() && ttsProvider !== 'browser') {
        logger.info({ sessionId: session.sessionId, ttsProvider }, 'Generating TTS for paid provider');
        await this.generateAndSendTTS(session, response, ttsProvider);
      } else if (ttsProvider === 'browser') {
        logger.info({ sessionId: session.sessionId }, 'Browser speech selected - skipping server TTS generation');
      }

      // Reset transcript
      session.transcript = '';
      logger.info({ sessionId: session.sessionId }, 'Transcript processing complete');
    } catch (error: any) {
      logger.error({
        error: error.message,
        code: error.code,
        status: error.status,
        stack: error.stack,
        sessionId: session.sessionId
      }, 'Final transcript processing failed');
      this.sendError(session.ws, 'Processing failed');
    }
  }

  /**
   * Handle the user's verbal yes/no response to a confirmation prompt.
   * Executes the pending intent on "haan", cancels on "nahi", asks again if unclear.
   */
  private async handlePendingConfirmation(session: VoiceSession, text: string, ttsProvider: string) {
    const pendingIntent = session.pendingIntent!;
    const lowerText = text.toLowerCase().trim().replace(/[।,!?.]/g, '');
    const words = new Set(lowerText.split(/\s+/));

    const YES_WORDS = new Set(['haan', 'ha', 'haa', 'yes', 'bilkul', 'ok', 'okay']);
    const NO_WORDS = new Set(['nahi', 'nai', 'no', 'nope', 'cancel']);
    const NO_PHRASES = ['mat karo', 'band karo', 'cancel karo', 'nahi chahiye', 'ruk jao'];
    const YES_PHRASES = ['theek hai', 'theek h'];

    const isYes = [...words].some((w) => YES_WORDS.has(w)) || YES_PHRASES.some((p) => lowerText.includes(p));
    const isNo = [...words].some((w) => NO_WORDS.has(w)) || NO_PHRASES.some((p) => lowerText.includes(p));

    if (!isYes && !isNo) {
      // Response was unclear — ask again, keep pendingIntent set
      const askAgain = getSysMsgs(session.ttsLanguage).askYesNo;
      this.sendMessage(session.ws, {
        type: WSMessageType.VOICE_RESPONSE,
        data: { text: askAgain },
        timestamp: new Date().toISOString(),
      });
      if (ttsProvider !== 'browser' && ttsService.isAvailable()) {
        await this.generateAndSendTTS(session, askAgain, ttsProvider);
      }
      return;
    }

    // Clear pending intent before proceeding
    session.pendingIntent = undefined;
    session.transcript = '';

    if (isNo) {
      const cancelText = getSysMsgs(session.ttsLanguage).cancelled;
      logger.info({ sessionId: session.sessionId, intent: pendingIntent.intent }, 'User cancelled pending intent');
      this.sendMessage(session.ws, {
        type: WSMessageType.VOICE_RESPONSE,
        data: { text: cancelText },
        timestamp: new Date().toISOString(),
      });
      if (ttsProvider !== 'browser' && ttsService.isAvailable()) {
        await this.generateAndSendTTS(session, cancelText, ttsProvider);
      }
      return;
    }

    // User confirmed — execute the stored intent now
    logger.info({ sessionId: session.sessionId, intent: pendingIntent.intent }, 'User confirmed — executing pending intent');
    try {
      const execStart = Date.now();
      const executionResult = await businessEngine.execute(pendingIntent, session.conversationSessionId);
      const execTime = Date.now() - execStart;
      logger.info({
        sessionId: session.sessionId,
        intent: pendingIntent.intent,
        executionSuccess: executionResult.success,
        executionMessage: executionResult.message,
        responseTimeMs: execTime,
      }, '[CONFIRMED INTENT] Business logic executed');

      voiceCommandsProcessed.inc({
        status: executionResult.success ? 'success' : 'error',
        provider: sttService.getProvider(),
      });

      const responseStart = Date.now();
      const response = await openaiService.generateResponse(
        executionResult,
        pendingIntent.intent,
        session.conversationSessionId,
        (chunk) => {
          this.sendMessage(session.ws, {
            type: 'voice:response:chunk',
            data: { text: chunk },
            timestamp: new Date().toISOString(),
          });
        },
        { userLanguage: session.ttsLanguage }
      );
      const responseTime = Date.now() - responseStart;
      logger.info({ sessionId: session.sessionId, response, responseTimeMs: responseTime }, '[CONFIRMED INTENT] Response generated');

      if (session.conversationSessionId) {
        conversationMemory.addAssistantMessage(session.conversationSessionId, response);
      }

      this.sendMessage(session.ws, {
        type: WSMessageType.VOICE_RESPONSE,
        data: { text: response, executionResult },
        timestamp: new Date().toISOString(),
      });

      if (ttsService.isAvailable() && ttsProvider !== 'browser') {
        await this.generateAndSendTTS(session, response, ttsProvider);
      }
    } catch (error: any) {
      logger.error({ error: error.message, sessionId: session.sessionId }, 'Failed to execute confirmed intent');
      this.sendError(session.ws, 'Processing failed');
    }
  }

  /**
   * Returns true when an intent must be confirmed by the user before execution:
   * low confidence, high-risk action (delete/cancel), or large amount (>₹5000).
   */
  private intentNeedsConfirmation(intent: IntentExtraction): boolean {
    const HIGH_RISK_INTENTS = new Set<string>([
      IntentType.DELETE_CUSTOMER_DATA,
      IntentType.CANCEL_INVOICE,
      IntentType.CANCEL_REMINDER,
    ]);

    if (intent.confidence < CONFIDENCE_THRESHOLD_EXECUTE) return true;
    if (HIGH_RISK_INTENTS.has(intent.intent)) return true;
    const amount = intent.entities?.amount;
    if (typeof amount === 'number' && amount > LARGE_AMOUNT_THRESHOLD) return true;
    return false;
  }

  /**
   * Build a confirmation question for the given intent in the session's active language.
   * Customer names and amounts stay in English; only the suffix changes per language.
   */
  private buildConfirmMessage(intent: IntentExtraction, lang: string = 'hi'): string {
    const customer = (intent.entities?.customer || intent.entities?.customerName || '') as string;
    const amount = intent.entities?.amount as number | undefined;
    const amountStr = amount ? `₹${amount}` : '';
    const yn = getSysMsgs(lang).confirmSuffix;

    switch (intent.intent) {
      case IntentType.ADD_CREDIT:
        return `${customer} ko ${amountStr} credit add karna hai — ${yn}`;
      case IntentType.RECORD_PAYMENT:
        return `${customer} se ${amountStr} payment leni hai — ${yn}`;
      case IntentType.CREATE_INVOICE:
        return `${customer} ka ${amountStr} invoice banana hai — ${yn}`;
      case IntentType.CANCEL_INVOICE:
        return `${customer} ka invoice cancel karna hai — ${yn}`;
      case IntentType.CANCEL_REMINDER:
        return `Reminder cancel karna hai — ${yn}`;
      case IntentType.DELETE_CUSTOMER_DATA:
        return `${customer} ka data permanently delete karna hai — ${yn}`;
      case IntentType.CREATE_CUSTOMER:
        return `${customer} ko naya customer add karna hai — ${yn}`;
      default:
        return `${intent.intent.replace(/_/g, ' ')} — ${yn}`;
    }
  }

  /**
   * Generate TTS and send to client
   */
  private async generateAndSendTTS(session: VoiceSession, text: string, ttsProvider?: string) {
    try {
      logger.info({ sessionId: session.sessionId, textLength: text.length, ttsProvider }, 'Starting TTS generation');

      const audioStream = await ttsService.generateSpeechStream(text, ttsProvider);
      logger.info({ sessionId: session.sessionId, isBuffer: Buffer.isBuffer(audioStream) }, 'TTS stream received');

      let audioBuffer: Buffer;
      if (Buffer.isBuffer(audioStream)) {
        audioBuffer = audioStream;
        logger.info({ sessionId: session.sessionId, size: audioBuffer.length }, 'TTS returned buffer directly');
      } else {
        logger.info({ sessionId: session.sessionId }, 'Converting TTS stream to buffer');
        audioBuffer = await ttsService.streamToBuffer(audioStream);
        logger.info({ sessionId: session.sessionId, size: audioBuffer.length }, 'TTS stream converted to buffer');
      }

      // Convert to base64 for WebSocket transmission
      const audioBase64 = ttsService.bufferToBase64(audioBuffer);

      // Send audio data
      this.sendMessage(session.ws, {
        type: WSMessageType.VOICE_TTS_STREAM,
        data: {
          audio: audioBase64,
          format: 'mp3',
          provider: ttsProvider,
        },
        timestamp: new Date().toISOString(),
      });

      logger.info({ sessionId: session.sessionId, audioSize: audioBuffer.length, provider: ttsProvider }, 'TTS audio sent to client');
    } catch (error: any) {
      logger.error({
        error: error.message,
        code: error.code,
        status: error.response?.status,
        stack: error.stack,
        sessionId: session.sessionId,
        provider: ttsService.getProvider(),
      }, 'TTS generation failed');
      // Don't throw - text response was already sent
    }
  }

  /**
   * Start recording
   */
  private async handleRecordingStart(session: VoiceSession) {
    session.isRecording = true;
    session.audioChunks = [];

    this.sendMessage(session.ws, {
      type: WSMessageType.RECORDING_STARTED,
      timestamp: new Date().toISOString(),
    });

    logger.info({ sessionId: session.sessionId }, 'Recording started');
  }

  /**
   * Stop recording and save
   */
  private async handleRecordingStop(session: VoiceSession) {
    session.isRecording = false;

    if (session.audioChunks.length > 0) {
      await this.saveRecording(session);
    }

    this.sendMessage(session.ws, {
      type: WSMessageType.RECORDING_STOPPED,
      timestamp: new Date().toISOString(),
    });

    logger.info({ sessionId: session.sessionId }, 'Recording stopped');
  }

  /**
   * Save recorded audio
   */
  private async saveRecording(session: VoiceSession) {
    if (!session.conversationSessionId) {
      logger.warn({ sessionId: session.sessionId }, 'No conversation session for recording');
      return;
    }

    try {
      const audioBuffer = Buffer.concat(session.audioChunks);
      const fileExtension = session.audioFormat === 'pcm' ? 'pcm' : 'webm';
      const fileName = `recording-${Date.now()}.${fileExtension}`;

      await voiceSessionService.saveRecording(
        session.conversationSessionId,
        audioBuffer,
        {
          fileName,
          mimeType: session.audioFormat === 'pcm' ? 'audio/pcm' : 'audio/webm',
        }
      );

      logger.info(
        { sessionId: session.sessionId, size: audioBuffer.length },
        'Recording saved'
      );

      // Clear chunks
      session.audioChunks = [];
    } catch (error) {
      logger.error({ error, sessionId: session.sessionId }, 'Failed to save recording');
    }
  }

  /**
   * Cleanup session
   */
  private async cleanupSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Close STT connection
    if (session.sttConnection) {
      try {
        session.sttConnection.finish();
      } catch (error) {
        logger.error({ error }, 'Error closing STT connection on cleanup');
      }
    }

    // End conversation session
    if (session.conversationSessionId) {
      try {
        await voiceSessionService.endSession(session.conversationSessionId);
      } catch (error) {
        logger.error({ error }, 'Error ending conversation session');
      }
    }

    this.sessions.delete(sessionId);
  }

  /**
   * Send message to client
   */
  private sendMessage(ws: WebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message
   */
  private sendError(ws: WebSocket, error: string) {
    this.sendMessage(ws, {
      type: WSMessageType.ERROR,
      data: { error },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Detect admin keywords in voice command
   * Admin can say: "admin delete", "manager delete", "admin mode", etc.
   */
  private isAdminCommand(text: string): boolean {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    const englishAdminKeywords = [
      'admin',
      'manager',
      'admin mode',
      'admin operation',
      'admin delete',
      'admin karo',
      'admin ke liye',
    ];

    // Check English keywords
    if (englishAdminKeywords.some((keyword) => lowerText.includes(keyword))) {
      return true;
    }

    // Check Hindi keywords (case-sensitive)
    const hindiAdminKeywords = ['एडमिन', 'प्रबंधक'];
    if (hindiAdminKeywords.some((keyword) => text.includes(keyword))) {
      return true;
    }

    return false;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `ws-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }
}

export const enhancedWebsocketHandler = new EnhancedWebSocketHandler();
