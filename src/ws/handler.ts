import { FastifyRequest } from 'fastify';
import { WebSocket, type RawData } from 'ws';
import { logger } from '../infrastructure/logger';
import { ErrorHandler, WebSocketError } from '../infrastructure/error-handler';
import { openaiService } from '../integrations/openai';
import { businessEngine } from '../modules/voice/engine';
import { conversationMemory } from '../modules/voice/conversation';
import { voiceSessionService } from '../modules/voice/session.service';
import { prisma } from '../infrastructure/database';
import { SYSTEM_TENANT_ID, SYSTEM_USER_ID } from '../infrastructure/bootstrap';
import { WSMessage, WSMessageType } from '../types';

interface VoiceSession {
  ws: WebSocket;
  sessionId: string;
  dbSessionId?: string;   // ConversationSession.id in DB (set async after connect)
  transcript: string;
  isActive: boolean;
}

class WebSocketHandler {
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
    };

    this.sessions.set(sessionId, session);
    logger.info({ sessionId }, 'WebSocket connected');

    // Create DB conversation session (non-blocking — we just need it for ConversationTurn FK)
    voiceSessionService.createSession({}).then((s) => {
      session.dbSessionId = s.id;
      logger.debug({ sessionId, dbSessionId: s.id }, 'DB session created');
    }).catch((err) => logger.warn({ err, sessionId }, 'Failed to create DB conversation session'));

    // Send welcome message with sessionId so client can track context
    this.sendMessage(connection, {
      type: WSMessageType.VOICE_START,
      data: { sessionId },
      timestamp: new Date().toISOString(),
    });

    // Handle messages
    connection.on('message', async (data: RawData, isBinary: boolean) => {
      try {
        if (isBinary) return;

        const message = JSON.parse(data.toString());
        await this.handleMessage(sessionId, message);
      } catch (error) {
        const wsError = new WebSocketError(
          error instanceof Error ? error.message : 'Message processing failed',
          { sessionId, isBinary }
        );
        ErrorHandler.logError(wsError);
        this.sendError(connection, wsError);
      }
    });

    // Handle close — end DB session gracefully
    connection.on('close', () => {
      logger.info({ sessionId }, 'WebSocket disconnected');
      if (session.dbSessionId) {
        voiceSessionService.endSession(session.dbSessionId)
          .catch((err) => logger.warn({ err, sessionId }, 'Failed to end DB session on disconnect'));
      }
      this.sessions.delete(sessionId);
    });

    // Handle errors
    connection.on('error', (error) => {
      const wsError = new WebSocketError(
        error instanceof Error ? error.message : 'WebSocket error occurred',
        { sessionId }
      );
      ErrorHandler.logError(wsError);
    });
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(sessionId: string, message: any) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    switch (message.type) {
      case 'voice:transcript':
        await this.handleTranscript(session, message.data);
        break;

      case 'voice:final':
        await this.handleFinalTranscript(session, message.data);
        break;

      case 'recording:start':
        session.isActive = true;
        this.sendMessage(session.ws, {
          type: WSMessageType.RECORDING_STARTED,
          timestamp: new Date().toISOString(),
        });
        break;

      case 'recording:stop':
        session.isActive = false;
        this.sendMessage(session.ws, {
          type: WSMessageType.RECORDING_STOPPED,
          timestamp: new Date().toISOString(),
        });
        break;

      default:
        logger.warn({ type: message.type }, 'Unknown message type');
    }
  }

  /**
   * Handle transcript (streaming)
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
   * Handle final transcript — full intent→execute→respond pipeline
   */
  private async handleFinalTranscript(session: VoiceSession, data: any) {
    const finalText = data.text || session.transcript;

    if (!finalText || finalText.trim().length === 0) return;

    const { sessionId } = session;
    logger.info({ sessionId, text: finalText }, 'Final transcript received');

    const startTime = Date.now();

    try {
      // Step 1: Normalize ASR transcript
      const normalizedText = await openaiService.normalizeTranscript(finalText);

      // Step 2: Extract intent — injects Redis conversation history via sessionId
      const intent = await openaiService.extractIntent(normalizedText, finalText, sessionId);

      this.sendMessage(session.ws, {
        type: WSMessageType.VOICE_INTENT,
        data: intent,
        timestamp: new Date().toISOString(),
      });

      // Step 3: Execute business logic with conversation context
      const executionResult = await businessEngine.execute(intent, sessionId);

      // Step 4: Generate natural language response with conversation context
      const response = await openaiService.generateResponse(executionResult, intent.intent, sessionId);

      // Step 5: Send response to client
      this.sendMessage(session.ws, {
        type: WSMessageType.VOICE_RESPONSE,
        data: { text: response, executionResult },
        timestamp: new Date().toISOString(),
      });

      // Step 6: TTS stream (placeholder — replace with real TTS in production)
      this.sendMessage(session.ws, {
        type: WSMessageType.VOICE_TTS_STREAM,
        data: { text: response },
        timestamp: new Date().toISOString(),
      });

      // Step 7: Persist turn to Redis conversation memory (keeps context alive across turns)
      await conversationMemory.addUserMessage(sessionId, finalText, intent.intent, intent.entities);
      await conversationMemory.addAssistantMessage(sessionId, response);

      // Step 8: Persist turn to DB — fire-and-forget (does NOT block real-time response)
      if (session.dbSessionId) {
        const processingTimeMs = Date.now() - startTime;
        conversationMemory.getTurnCount(sessionId).then((turnNumber) => {
          prisma.conversationTurn.create({
            data: {
              sessionId:        session.dbSessionId!,
              tenantId:         SYSTEM_TENANT_ID,
              userId:           SYSTEM_USER_ID,
              turnNumber,
              rawInput:         finalText,
              normalizedInput:  normalizedText,
              intent:           intent.intent,
              intentConfidence: intent.confidence,
              entities:         intent.entities as any,
              response,
              responseType:     'voice',
              processingTimeMs,
            } as any,
          }).catch((err) => logger.error({ err, sessionId }, 'Failed to persist conversation turn to DB'));
        }).catch(() => { /* non-critical — turn count unavailable */ });
      }

      // Reset transcript buffer
      session.transcript = '';
    } catch (error) {
      logger.error({ error, sessionId }, 'Final transcript processing failed');
      this.sendError(session.ws, 'Processing failed');
    }
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
  private sendError(ws: WebSocket, error: string | WebSocketError) {
    const errorMessage = typeof error === 'string' ? error : error.message;

    this.sendMessage(ws, {
      type: WSMessageType.ERROR,
      data: { error: errorMessage },
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

export const websocketHandler = new WebSocketHandler();
