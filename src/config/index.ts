import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    url: process.env.DATABASE_URL || '',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // MinIO
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'execora',
    useSSL: process.env.MINIO_USE_SSL === 'true',
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  },

  // WhatsApp
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
  },

  // STT
  stt: {
    provider: process.env.STT_PROVIDER || 'deepgram',
    deepgram: {
      apiKey: process.env.DEEPGRAM_API_KEY || '',
    },
    elevenlabs: {
      apiKey: process.env.ELEVENLABS_API_KEY || '',
      modelId: process.env.ELEVENLABS_STT_MODEL || 'scribe_v2',
      languageCode: process.env.ELEVENLABS_STT_LANGUAGE || '',
      realtimeModelId: process.env.ELEVENLABS_STT_REALTIME_MODEL || 'scribe_v2_realtime',
    },
  },

  // TTS
  tts: {
    provider: process.env.TTS_PROVIDER || 'elevenlabs',
    elevenlabs: {
      apiKey: process.env.ELEVENLABS_API_KEY || '',
      voiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
    },
  },

  // Timezone
  timezone: process.env.TZ || 'Asia/Kolkata',
} as const;
