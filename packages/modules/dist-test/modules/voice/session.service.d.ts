import { Prisma } from '@prisma/client';
declare class VoiceSessionService {
    /**
     * Create new conversation session
     */
    createSession(metadata?: any): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.SessionStatus;
        customerId: string | null;
        userId: string;
        priority: import(".prisma/client").$Enums.ConversationPriority;
        sessionKey: string | null;
        queuePosition: number | null;
        contextStack: Prisma.JsonValue;
        version: number;
        sessionStart: Date;
        lastActivity: Date;
        expectedResumeTime: Date | null;
        turnCount: number;
        customerSnapshot: Prisma.JsonValue | null;
        deviceInfo: Prisma.JsonValue | null;
        channel: string;
    }>;
    /**
     * End conversation session
     */
    endSession(sessionId: string, duration?: number): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.SessionStatus;
        customerId: string | null;
        userId: string;
        priority: import(".prisma/client").$Enums.ConversationPriority;
        sessionKey: string | null;
        queuePosition: number | null;
        contextStack: Prisma.JsonValue;
        version: number;
        sessionStart: Date;
        lastActivity: Date;
        expectedResumeTime: Date | null;
        turnCount: number;
        customerSnapshot: Prisma.JsonValue | null;
        deviceInfo: Prisma.JsonValue | null;
        channel: string;
    }>;
    /**
     * Save audio recording to MinIO and database
     */
    saveRecording(sessionId: string, audioBuffer: Buffer, metadata: {
        fileName: string;
        duration?: number;
        mimeType?: string;
    }): Promise<{
        tenantId: string;
        id: string;
        metadata: Prisma.JsonValue;
        createdAt: Date;
        customerId: string | null;
        expiresAt: Date | null;
        retentionDays: number;
        sessionId: string | null;
        recordingUrl: string;
        recordingFormat: string;
        durationSeconds: number | null;
        fileSizeBytes: bigint | null;
        transcript: string | null;
        transcriptConfidence: Prisma.Decimal | null;
        detectedLanguage: string | null;
        intentAtTime: string | null;
        entitiesAtTime: Prisma.JsonValue | null;
        bucketName: string;
        objectKey: string;
        etag: string | null;
        isDeleted: boolean;
        conversationTurnId: string | null;
        triggeredBy: string | null;
    }>;
    /**
     * Get recording download URL
     */
    getRecordingUrl(recordingId: string, expirySeconds?: number): Promise<string>;
    /**
     * Get recordings for a session
     */
    getSessionRecordings(sessionId: string): Promise<{
        tenantId: string;
        id: string;
        metadata: Prisma.JsonValue;
        createdAt: Date;
        customerId: string | null;
        expiresAt: Date | null;
        retentionDays: number;
        sessionId: string | null;
        recordingUrl: string;
        recordingFormat: string;
        durationSeconds: number | null;
        fileSizeBytes: bigint | null;
        transcript: string | null;
        transcriptConfidence: Prisma.Decimal | null;
        detectedLanguage: string | null;
        intentAtTime: string | null;
        entitiesAtTime: Prisma.JsonValue | null;
        bucketName: string;
        objectKey: string;
        etag: string | null;
        isDeleted: boolean;
        conversationTurnId: string | null;
        triggeredBy: string | null;
    }[]>;
    /**
     * Get recent sessions
     */
    getRecentSessions(limit?: number): Promise<({
        voiceRecordings: {
            id: string;
            createdAt: Date;
            durationSeconds: number | null;
            objectKey: string;
        }[];
    } & {
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.SessionStatus;
        customerId: string | null;
        userId: string;
        priority: import(".prisma/client").$Enums.ConversationPriority;
        sessionKey: string | null;
        queuePosition: number | null;
        contextStack: Prisma.JsonValue;
        version: number;
        sessionStart: Date;
        lastActivity: Date;
        expectedResumeTime: Date | null;
        turnCount: number;
        customerSnapshot: Prisma.JsonValue | null;
        deviceInfo: Prisma.JsonValue | null;
        channel: string;
    })[]>;
    /**
     * Delete recording from MinIO and database
     */
    deleteRecording(recordingId: string): Promise<void>;
}
export declare const voiceSessionService: VoiceSessionService;
export {};
//# sourceMappingURL=session.service.d.ts.map