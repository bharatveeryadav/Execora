import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { minioClient } from '../../infrastructure/storage';
import { SYSTEM_TENANT_ID, SYSTEM_USER_ID } from '../../infrastructure/bootstrap';

const BUCKET_NAME = process.env.MINIO_BUCKET || 'execora-audio';

class VoiceSessionService {
  /**
   * Create new conversation session
   */
  async createSession(metadata?: any) {
    try {
      const session = await prisma.conversationSession.create({
        data: {
          tenantId:   SYSTEM_TENANT_ID,
          userId:     SYSTEM_USER_ID,
          contextStack: metadata ? { current: { stage: 'idle', intent: null, entities: {}, pending_input: false }, metadata: { turn_count: 0, started_at: null, ...metadata } } : undefined,
        } as any,
      });

      logger.info({ sessionId: session.id }, 'Conversation session created');
      return session;
    } catch (error) {
      logger.error({ error }, 'Session creation failed');
      throw error;
    }
  }

  /**
   * End conversation session
   */
  async endSession(sessionId: string, duration?: number) {
    try {
      const session = await prisma.conversationSession.update({
        where: { id: sessionId },
        data:  { status: 'ended' } as any,
      });

      logger.info({ sessionId, duration }, 'Session ended');
      return session;
    } catch (error) {
      logger.error({ error, sessionId }, 'End session failed');
      throw error;
    }
  }

  /**
   * Save audio recording to MinIO and database
   */
  async saveRecording(
    sessionId: string,
    audioBuffer: Buffer,
    metadata: {
      fileName: string;
      duration?: number;
      mimeType?: string;
    }
  ) {
    try {
      const objectKey = `recordings/${sessionId}/${metadata.fileName}`;

      await minioClient.uploadFile(objectKey, audioBuffer, {
        contentType: metadata.mimeType || 'audio/webm',
      });

      const recording = await prisma.voiceRecording.create({
        data: {
          tenantId:        SYSTEM_TENANT_ID,
          sessionId,
          recordingUrl:    `${BUCKET_NAME}/${objectKey}`,
          recordingFormat: metadata.mimeType || 'audio/webm',
          durationSeconds: metadata.duration ? Math.round(metadata.duration) : undefined,
          fileSizeBytes:   BigInt(audioBuffer.length),
          bucketName:      BUCKET_NAME,
          objectKey,
        } as any,
      });

      logger.info(
        { recordingId: recording.id, sessionId, fileName: metadata.fileName, size: audioBuffer.length },
        'Recording saved'
      );

      return recording;
    } catch (error) {
      logger.error({ error, sessionId, metadata }, 'Save recording failed');
      throw error;
    }
  }

  /**
   * Get recording download URL
   */
  async getRecordingUrl(recordingId: string, expirySeconds: number = 3600): Promise<string> {
    try {
      const recording = await prisma.voiceRecording.findUnique({
        where: { id: recordingId },
      });

      if (!recording) throw new Error('Recording not found');

      return await minioClient.getPresignedUrl((recording as any).objectKey, expirySeconds);
    } catch (error) {
      logger.error({ error, recordingId }, 'Get recording URL failed');
      throw error;
    }
  }

  /**
   * Get recordings for a session
   */
  async getSessionRecordings(sessionId: string) {
    return await prisma.voiceRecording.findMany({
      where:   { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get recent sessions
   */
  async getRecentSessions(limit: number = 20) {
    return await prisma.conversationSession.findMany({
      take:    limit,
      orderBy: { sessionStart: 'desc' },
      include: {
        voiceRecordings: {
          select: {
            id:              true,
            objectKey:       true,
            durationSeconds: true,
            createdAt:       true,
          },
        },
      },
    });
  }

  /**
   * Delete recording from MinIO and database
   */
  async deleteRecording(recordingId: string) {
    try {
      const recording = await prisma.voiceRecording.findUnique({
        where: { id: recordingId },
      });

      if (!recording) throw new Error('Recording not found');

      await minioClient.deleteFile((recording as any).objectKey);

      await prisma.voiceRecording.update({
        where: { id: recordingId },
        data:  { isDeleted: true },
      });

      logger.info({ recordingId }, 'Recording deleted');
    } catch (error) {
      logger.error({ error, recordingId }, 'Delete recording failed');
      throw error;
    }
  }
}

export const voiceSessionService = new VoiceSessionService();
