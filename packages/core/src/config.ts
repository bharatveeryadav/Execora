import dotenv from 'dotenv';
import path from 'path';

// Load .env from repo root regardless of cwd (works when run via Turborepo from apps/api/)
// __dirname = packages/infrastructure/src/ (tsx) or packages/infrastructure/dist/ (compiled)
// 3 levels up → repo root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
// Fallback: also try cwd-relative (works when run from repo root directly)
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

  // Groq — fast LPU inference (~150ms vs ~1400ms from India). Free at https://console.groq.com
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
  },

  // Ollama — local/self-hosted LLM (no internet, no API key required)
  // Start: `ollama serve` + `ollama pull llama3.2`
  // Docs: https://ollama.com
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model:   process.env.OLLAMA_MODEL    || 'llama3.2',
    // Set to true only when OLLAMA_BASE_URL is explicitly configured
    enabled: !!process.env.OLLAMA_BASE_URL,
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
      apiKey:           process.env.ELEVENLABS_API_KEY             || '',
      modelId:          process.env.ELEVENLABS_STT_MODEL           || 'scribe_v2',
      languageCode:     process.env.ELEVENLABS_STT_LANGUAGE        || '',
      realtimeModelId:  process.env.ELEVENLABS_STT_REALTIME_MODEL  || 'scribe_v2_realtime',
    },
    // Local Whisper — runs fully offline via whisper-asr-webservice or faster-whisper
    // Start: docker run -p 9000:9000 onerahmet/openai-whisper-asr-webservice:latest
    // Docs: https://github.com/ahmetoner/whisper-asr-webservice
    whisper: {
      baseUrl: process.env.WHISPER_BASE_URL || 'http://localhost:9000',
      model:   process.env.WHISPER_MODEL    || 'base',
      language: process.env.WHISPER_LANGUAGE || 'hi',
      enabled: !!process.env.WHISPER_BASE_URL,
    },
  },

  // TTS
  tts: {
    provider: process.env.TTS_PROVIDER || 'elevenlabs',
    elevenlabs: {
      apiKey:  process.env.ELEVENLABS_API_KEY   || '',
      voiceId: process.env.ELEVENLABS_VOICE_ID  || '21m00Tcm4TlvDq8ikWAM',
    },
    // Local Piper TTS — runs fully offline, supports Hindi
    // Start: docker run -p 5000:5000 rhasspy/wyoming-piper --voice hi_IN-deepika-medium
    // Docs: https://github.com/rhasspy/piper
    piper: {
      baseUrl: process.env.PIPER_BASE_URL || 'http://localhost:5000',
      voice:   process.env.PIPER_VOICE    || 'hi_IN-deepika-medium',
      enabled: !!process.env.PIPER_BASE_URL,
    },
  },

  // Timezone
  timezone: process.env.TZ || 'Asia/Kolkata',

  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS || '',

  // Admin API — key required for all /admin/* endpoints
  // Generate a strong random value: openssl rand -hex 32
  adminApiKey: process.env.ADMIN_API_KEY || '',

  // JWT — used for business-user authentication on /api/v1/* routes
  // Generate secret: openssl rand -hex 64
  jwt: {
    secret:              process.env.JWT_SECRET || '',
    accessExpiresInSec:  parseInt(process.env.JWT_ACCESS_EXPIRES_SECONDS  || '900',   10), // 15 min default
    refreshExpiresInSec: parseInt(process.env.JWT_REFRESH_EXPIRES_SECONDS || '604800', 10), // 7 days default
  },
} as const;

// Fail fast on startup if critical env vars are missing
if (!process.env.DATABASE_URL) {
  throw new Error(
    '[Config] DATABASE_URL is required but not set. ' +
    'Please configure your .env file before starting the server.'
  );
}
