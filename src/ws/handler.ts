import { FastifyRequest } from 'fastify';
import { WebSocket, type RawData } from 'ws';
import { logger } from '../infrastructure/logger';
import { ErrorHandler, WebSocketError } from '../infrastructure/error-handler';
import { openaiService } from '../integrations/openai';
import { businessEngine } from '../modules/voice/engine';
import { WSMessage, WSMessageType } from '../types';

interface VoiceSession {
  ws: WebSocket;
  sessionId: string;
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

    // Send welcome message
    this.sendMessage(connection, {
      type: WSMessageType.VOICE_START,
      data: { sessionId },
      timestamp: new Date().toISOString(),
    });

    // Handle messages
    connection.on('message', async (data: RawData, isBinary: boolean) => {
      try {
        if (isBinary) {
          return;
        }

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

    // Handle close
    connection.on('close', () => {
      logger.info({ sessionId }, 'WebSocket disconnected');
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

    // Send transcript back
    this.sendMessage(session.ws, {
      type: WSMessageType.VOICE_TRANSCRIPT,
      data: { text: session.transcript },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle final transcript (execute intent)
   */
  private async handleFinalTranscript(session: VoiceSession, data: any) {
    const finalText = data.text || session.transcript;

    if (!finalText || finalText.trim().length === 0) {
      return;
    }

    logger.info({ sessionId: session.sessionId, text: finalText }, 'Final transcript received');

    try {
      const normalizedText = await openaiService.normalizeTranscript(finalText);

      // 1. Extract intent
      const intent = await openaiService.extractIntent(normalizedText, finalText);

      this.sendMessage(session.ws, {
        type: WSMessageType.VOICE_INTENT,
        data: intent,
        timestamp: new Date().toISOString(),
      });

      // 2. Execute business logic
      const executionResult = await businessEngine.execute(intent);

      // 3. Generate natural response
      const response = await openaiService.generateResponse(executionResult, intent.intent);

      // 4. Send response
      this.sendMessage(session.ws, {
        type: WSMessageType.VOICE_RESPONSE,
        data: {
          text: response,
          executionResult,
        },
        timestamp: new Date().toISOString(),
      });

      // 5. Generate TTS (placeholder - integrate with actual TTS service)
      // In production, this would stream audio back
      this.sendMessage(session.ws, {
        type: WSMessageType.VOICE_TTS_STREAM,
        data: {
          text: response,
          // audio: base64EncodedAudio
        },
        timestamp: new Date().toISOString(),
      });

      // Reset transcript
      session.transcript = '';
    } catch (error) {
      logger.error({ error, sessionId: session.sessionId }, 'Final transcript processing failed');
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
    const errorMessage = typeof error === 'string'
      ? error
      : error.message;

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
