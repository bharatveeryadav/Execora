import { FastifyRequest } from 'fastify';
import { WebSocket, type RawData } from 'ws';
import { logger } from '../lib/logger';
import { openaiService } from '../services/openai.service';
import { businessEngine } from '../business/execution-engine';
import { sttService } from '../services/stt.service';
import { ttsService } from '../services/tts.service';
import { voiceSessionService } from '../business/voice-session.service';
import { conversationMemory } from '../business/conversation-memory.service';
import { WSMessage, WSMessageType } from '../types';

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
}

class EnhancedWebSocketHandler {
  private sessions: Map<string, VoiceSession> = new Map();

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
    };

    this.sessions.set(sessionId, session);

    logger.info({ sessionId }, 'WebSocket connected');

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

    logger.info({ sessionId: session.sessionId, textLength: text.length, ttsProvider }, 'Processing final transcript');

    try {
      logger.debug({ sessionId: session.sessionId }, 'Step 1: Normalizing transcript');
      const normalizedText = await openaiService.normalizeTranscript(text);
      logger.debug({ sessionId: session.sessionId, originalLength: text.length, normalizedLength: normalizedText.length }, 'Step 1 complete: Transcript normalized');

      // 1. Extract intent with conversation context
      logger.debug({ sessionId: session.sessionId }, 'Step 2: Extracting intent');
      const intent = await openaiService.extractIntent(normalizedText, text, session.conversationSessionId);
      logger.debug({ sessionId: session.sessionId, intent: intent.intent, confidence: intent.confidence }, 'Step 2 complete: Intent extracted');

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
      logger.info({ sessionId: session.sessionId }, 'VOICE_INTENT message sent');

      // 2. Execute business logic
      logger.debug({ sessionId: session.sessionId }, 'Step 3: Executing business logic');
      const executionResult = await businessEngine.execute(intent, session.conversationSessionId);
      logger.debug({ sessionId: session.sessionId, success: executionResult.success }, 'Step 3 complete: Business logic executed');

      // 3. Generate natural response with conversation context
      logger.debug({ sessionId: session.sessionId }, 'Step 4: Generating natural response');
      const response = await openaiService.generateResponse(executionResult, intent.intent, session.conversationSessionId);
      logger.debug({ sessionId: session.sessionId, responseLength: response.length }, 'Step 4 complete: Response generated: ' + response);

      // Log assistant response to conversation memory
      if (session.conversationSessionId) {
        conversationMemory.addAssistantMessage(session.conversationSessionId, response);
      }

      // 4. Send text response
      logger.info({ sessionId: session.sessionId, response, wsOpen: session.ws.readyState === 1 }, 'Sending VOICE_RESPONSE message');
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
