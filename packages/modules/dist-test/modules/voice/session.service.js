"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceSessionService = void 0;
const core_1 = require("@execora/core");
const core_2 = require("@execora/core");
const core_3 = require("@execora/core");
const core_4 = require("@execora/core");
const client_1 = require("@prisma/client");
const BUCKET_NAME = process.env.MINIO_BUCKET || 'execora-audio';
class VoiceSessionService {
    /**
     * Create new conversation session
     */
    async createSession(metadata) {
        try {
            const session = await core_1.prisma.conversationSession.create({
                data: {
                    tenantId: core_4.tenantContext.get().tenantId,
                    userId: core_4.tenantContext.get().userId,
                    contextStack: metadata ? { current: { stage: 'idle', intent: null, entities: {}, pending_input: false }, metadata: { turn_count: 0, started_at: null, ...metadata } } : undefined,
                },
            });
            core_2.logger.info({ sessionId: session.id }, 'Conversation session created');
            return session;
        }
        catch (error) {
            core_2.logger.error({ error }, 'Session creation failed');
            throw error;
        }
    }
    /**
     * End conversation session
     */
    async endSession(sessionId, duration) {
        try {
            const session = await core_1.prisma.conversationSession.update({
                where: { id: sessionId },
                data: { status: client_1.SessionStatus.ended },
            });
            core_2.logger.info({ sessionId, duration }, 'Session ended');
            return session;
        }
        catch (error) {
            core_2.logger.error({ error, sessionId }, 'End session failed');
            throw error;
        }
    }
    /**
     * Save audio recording to MinIO and database
     */
    async saveRecording(sessionId, audioBuffer, metadata) {
        try {
            const objectKey = `recordings/${sessionId}/${metadata.fileName}`;
            await core_3.minioClient.uploadFile(objectKey, audioBuffer, {
                contentType: metadata.mimeType || 'audio/webm',
            });
            const recording = await core_1.prisma.voiceRecording.create({
                data: {
                    tenantId: core_4.tenantContext.get().tenantId,
                    sessionId,
                    recordingUrl: `${BUCKET_NAME}/${objectKey}`,
                    recordingFormat: metadata.mimeType || 'audio/webm',
                    durationSeconds: metadata.duration ? Math.round(metadata.duration) : undefined,
                    fileSizeBytes: BigInt(audioBuffer.length),
                    bucketName: BUCKET_NAME,
                    objectKey,
                },
            });
            core_2.logger.info({ recordingId: recording.id, sessionId, fileName: metadata.fileName, size: audioBuffer.length }, 'Recording saved');
            return recording;
        }
        catch (error) {
            core_2.logger.error({ error, sessionId, metadata }, 'Save recording failed');
            throw error;
        }
    }
    /**
     * Get recording download URL
     */
    async getRecordingUrl(recordingId, expirySeconds = 3600) {
        try {
            const recording = await core_1.prisma.voiceRecording.findUnique({
                where: { id: recordingId },
            });
            if (!recording)
                throw new Error('Recording not found');
            return await core_3.minioClient.getPresignedUrl(recording.objectKey, expirySeconds);
        }
        catch (error) {
            core_2.logger.error({ error, recordingId }, 'Get recording URL failed');
            throw error;
        }
    }
    /**
     * Get recordings for a session
     */
    async getSessionRecordings(sessionId) {
        return await core_1.prisma.voiceRecording.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
        });
    }
    /**
     * Get recent sessions
     */
    async getRecentSessions(limit = 20) {
        return await core_1.prisma.conversationSession.findMany({
            take: limit,
            orderBy: { sessionStart: 'desc' },
            include: {
                voiceRecordings: {
                    select: {
                        id: true,
                        objectKey: true,
                        durationSeconds: true,
                        createdAt: true,
                    },
                },
            },
        });
    }
    /**
     * Delete recording from MinIO and database
     */
    async deleteRecording(recordingId) {
        try {
            const recording = await core_1.prisma.voiceRecording.findUnique({
                where: { id: recordingId },
            });
            if (!recording)
                throw new Error('Recording not found');
            await core_3.minioClient.deleteFile(recording.objectKey);
            await core_1.prisma.voiceRecording.update({
                where: { id: recordingId },
                data: { isDeleted: true },
            });
            core_2.logger.info({ recordingId }, 'Recording deleted');
        }
        catch (error) {
            core_2.logger.error({ error, recordingId }, 'Delete recording failed');
            throw error;
        }
    }
}
exports.voiceSessionService = new VoiceSessionService();
//# sourceMappingURL=session.service.js.map