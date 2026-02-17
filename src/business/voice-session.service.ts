import { prisma } from '../lib/database';
import { logger } from '../lib/logger';
import { minioClient } from '../lib/minio';
import { Readable } from 'stream';

class VoiceSessionService {
  /**
   * Create new conversation session
   */
  async createSession(metadata?: any) {
    try {
      const session = await prisma.conversationSession.create({
        data: {
          metadata: metadata || {},
        },
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
        data: {
          endedAt: new Date(),
          duration,
        },
      });

      logger.info({ sessionId, duration }, 'Session ended');
      return session;
    } catch (error) {
      logger.error({ error, sessionId }, 'End session failed');
      throw error;
    }
  }

  /**
   * Save audio recording
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
      // Upload to MinIO
      const filePath = `recordings/${sessionId}/${metadata.fileName}`;
      
      await minioClient.uploadFile(filePath, audioBuffer, {
        contentType: metadata.mimeType || 'audio/webm',
      });

      // Save recording metadata
      const recording = await prisma.conversationRecording.create({
        data: {
          sessionId,
          filePath,
          fileName: metadata.fileName,
          duration: metadata.duration,
          size: audioBuffer.length,
          mimeType: metadata.mimeType || 'audio/webm',
        },
      });

      logger.info(
        {
          recordingId: recording.id,
          sessionId,
          fileName: metadata.fileName,
          size: audioBuffer.length,
        },
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
      const recording = await prisma.conversationRecording.findUnique({
        where: { id: recordingId },
      });

      if (!recording) {
        throw new Error('Recording not found');
      }

      return await minioClient.getPresignedUrl(recording.filePath, expirySeconds);
    } catch (error) {
      logger.error({ error, recordingId }, 'Get recording URL failed');
      throw error;
    }
  }

  /**
   * Get session recordings
   */
  async getSessionRecordings(sessionId: string) {
    return await prisma.conversationRecording.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get recent sessions
   */
  async getRecentSessions(limit: number = 20) {
    return await prisma.conversationSession.findMany({
      take: limit,
      orderBy: { startedAt: 'desc' },
      include: {
        recordings: {
          select: {
            id: true,
            fileName: true,
            duration: true,
            createdAt: true,
          },
        },
      },
    });
  }

  /**
   * Delete recording
   */
  async deleteRecording(recordingId: string) {
    try {
      const recording = await prisma.conversationRecording.findUnique({
        where: { id: recordingId },
      });

      if (!recording) {
        throw new Error('Recording not found');
      }

      // Delete from MinIO
      await minioClient.deleteFile(recording.filePath);

      // Delete from database
      await prisma.conversationRecording.delete({
        where: { id: recordingId },
      });

      logger.info({ recordingId }, 'Recording deleted');
    } catch (error) {
      logger.error({ error, recordingId }, 'Delete recording failed');
      throw error;
    }
  }
}

export const voiceSessionService = new VoiceSessionService();
